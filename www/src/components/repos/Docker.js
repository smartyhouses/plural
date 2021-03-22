import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Loading, Tabs, TabHeader, TabHeaderItem, TabContent } from 'forge-core'
import { useQuery } from 'react-apollo'
import { useHistory, useParams } from 'react-router'
import { DOCKER_IMG_Q, DOCKER_Q } from './queries'
import { AttackVector, ColorMap, DEFAULT_DKR_ICON, DKR_DNS } from './constants'
import { DetailContainer } from './Installation'
import moment from 'moment'
import { Anchor, Box, Collapsible, Text } from 'grommet'
import { Link } from 'grommet-icons'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { DockerImages } from './DockerImages'
import { Graph, RangePicker } from '../metrics/Graph'

function DockerHeader({image}) {
  return (
    <Box flex={false} direction='row' align='center' gap='medium'>
      <Box flex={false} width='50px' heigh='50px'>
        <img alt='' width='50px' height='50px' src={DEFAULT_DKR_ICON} />
      </Box>
      <Box fill='horizontal'>
        <Text size='medium'>{image.dockerRepository.name}:{image.tag}</Text>
        <Text size='small' color='dark-3'>{image.digest}</Text>
      </Box>
      <Box flex={false}>
        <GradeNub text={image.grade} severity={image.grade} />
      </Box>
    </Box>
  )
}

function DockerSidebar({image: {dockerRepository: docker, ...image}, filter, setFilter}) {
  const data = useMemo(() => {
    return docker.metrics.map(({tags, values}) => {
      const tag = tags.find(({name}) => name === 'tag')
      
      return {
        id: tag ? tag.value : docker.name, 
        data: values.map(({time, value}) => ({x: moment(time).toDate(), y: value}))
      }
    })
  }, [docker.metrics])
  console.log(data)

  return (
    <Box style={{overflow: 'auto'}} fill='vertical' gap='small'>
      <DetailContainer flex={false} pad='small' gap='small' >
        <Text weight="bold" size='small'>Pull Command</Text>
        <Box background='sidebar' pad='xsmall'>
          <pre>docker pull {DKR_DNS}/{docker.repository.name}/{docker.name}:{image.tag}</pre>
        </Box>

        <Text weight="bold" size='small'>Created At</Text>
        <Text size='small'>{moment(image.insertedAt).format('lll')}</Text>
      </DetailContainer>

      <DetailContainer height='400px' pad='small' gap='small'>
        <Box flex={false} direction='row' gap='xsmall' align='center'>
          <Box direction='row' fill='horizontal'>
            <Text size='small' weight={500}>Pull Metrics</Text>
          </Box>
          <RangePicker 
            duration={{offset: filter.offset, step: filter.precision}} 
            setDuration={({offset, step}) => setFilter({...filter, offset, precision: step})} />
        </Box>
        <Box fill>
          <Graph
            data={data}
            precision={filter.precision} 
            offset={filter.offset} />
        </Box>
      </DetailContainer>
    </Box>
  )
}

function NoVulnerabilities() {
  return (
    <Box fill justify='center' align='center'>
      <Text weight='bold'>This image is vulnerability free</Text>
    </Box>
  )
}

export function GradeNub({text, severity}) {
  return (
    <Box flex={false} pad={{horizontal: 'xsmall', vertical: 'xxsmall'}} background={ColorMap[severity]}
         align='center' justify='center' round='xsmall' width='75px' >
      <Text size='small'>{text}</Text>
    </Box>
  )
}

function VectorSection({text, background}) {
  return (
    <Box pad={{vertical: 'xsmall'}} width='150px' background='light-1' 
        align='center' justify='center' border={background && {side: 'bottom', size: '3px', color: background}}>
      <Text size='small'>{text}</Text>
    </Box>
  )
}

function CVSSRow({text, value, options, colorMap}) {
  return (
    <Box direction='row' align='center'>
      <Box width='150px' flex={false}><Text size='small' weight={500}>{text}</Text></Box>
      <Box direction='row' fill='horizontal' gap='xsmall'>
        {options.map(({name, value: val}) => (
          <VectorSection key={name} background={value === val ? colorMap[val] : null} text={name} />
        ))}
      </Box>
    </Box>
  )
}

function VulnerabilityDetail({vuln}) {
  return (
    <Box flex={false} pad='small' gap='medium'>
      <Box flex={false} gap='small'>
        <Text size='small' weight={500}>{vuln.title}</Text>
        <Text size='small'>{vuln.description}</Text>
      </Box>
      <Box flex={false} gap='small'>
        <Box direction='row' gap='xsmall'>
          <Text size='small' weight={500}>CVSS V3 Vector</Text>
          <Text size='small'>(source {vuln.source}, score: <b>{vuln.score}</b>)</Text>
        </Box>
        <Text size='small' weight={500}>EXPLOITABILITY METRICS</Text>
        <Box flex={false} gap='xsmall'>
          <CVSSRow text='Attack Vector' value={vuln.cvss.attackVector} options={[
            {name: 'Physical', value: AttackVector.PHYSICAL},
            {name: 'Local', value: AttackVector.LOCAL},
            {name: "Adjacent Network", value: AttackVector.ADJACENT},
            {name: "Network", value: AttackVector.NETWORK}
          ]} colorMap={ColorMap} />
          <CVSSRow text='Attack Complexity' value={vuln.cvss.attackComplexity} options={[
            {name: 'High', value: 'HIGH'},
            {name: 'Low', value: "LOW"}
          ]} colorMap={{'HIGH': 'low', 'LOW': 'high'}}/>
          <CVSSRow text='Privileges Required' value={vuln.cvss.privilegesRequired} options={[
            {name: 'High', value: 'HIGH'},
            {name: 'Low', value: "LOW"},
            {name: 'None', value: "NONE"}
          ]} colorMap={{'HIGH': 'low', 'LOW': 'high', 'NONE': 'critical'}}/>
          <CVSSRow text='User Interaction' value={vuln.cvss.userInteraction} options={[
            {name: 'Required', value: 'REQUIRED'},
            {name: 'None', value: "NONE"}
          ]} colorMap={{'REQUIRED': 'low', 'NONE': 'high'}}/>
        </Box>
        <Text size='small' weight={500}>IMPACT METRICS</Text>
        <Box flex={false} gap='xsmall'>
          <CVSSRow text='Confidentiality' value={vuln.cvss.confidentiality} options={[
            {name: 'None', value: 'NONE'},
            {name: 'Low', value: "LOW"},
            {name: 'High', value: 'HIGH'}
          ]} colorMap={{'NONE': 'low', 'LOW': 'medium', 'HIGH': 'high'}}/>
          <CVSSRow text='Integrity' value={vuln.cvss.integrity} options={[
            {name: 'None', value: 'NONE'},
            {name: 'Low', value: "LOW"},
            {name: 'High', value: 'HIGH'}
          ]} colorMap={{'NONE': 'low', 'LOW': 'medium', 'HIGH': 'high'}}/>
          <CVSSRow text='Availability' value={vuln.cvss.availability} options={[
            {name: 'None', value: 'NONE'},
            {name: 'Low', value: "LOW"},
            {name: 'High', value: 'HIGH'}
          ]} colorMap={{'NONE': 'low', 'LOW': 'medium', 'HIGH': 'high'}}/>
        </Box>
      </Box>
    </Box>
  )
}

function Vulnerability({vuln}) {
  const [open, setOpen] = useState(false)
  return (
    <Box flex={false} border={{side: 'bottom', color: 'light-3'}}>
      <Box direction='row' gap='small' align='center' pad='xsmall' onClick={() => setOpen(!open)} 
          hoverIndicator='light-3' focusIndicator={false}>
        <Box width='30%' direction='row' gap='small'>
          <Text size='small' weight={500}>{vuln.vulnerabilityId}</Text>
          {vuln.url && <Anchor size='small' href={vuln.url} target="_blank"><Link size='small' /></Anchor>}
        </Box>
        <Box flex={false} width='15%' direction='row' gap='xsmall' align='center'>
          <Box width='15px' height='15px' round='xsmall' background={ColorMap[vuln.severity]} />
          <Text size='small'>{vuln.severity}</Text>
        </Box>
        <HeaderItem text={vuln.package} width='25%' nobold />
        <HeaderItem text={vuln.installedVersion} width='15%' nobold />
        <HeaderItem text={vuln.fixedVersion} width='15%' nobold />
      </Box>
      <Collapsible open={open}>
        <VulnerabilityDetail vuln={vuln} />
      </Collapsible>
    </Box>
  )
}

const HeaderItem = ({text, width, nobold}) => (<Box width={width}><Text size='small' weight={nobold ? null : 500}>{text}</Text></Box>)

function VulnerabilityHeader() {
  return (
    <Box flex={false} direction='row' pad='xsmall' border={{side: 'bottom', color: 'light-5'}} align='center'>
      <HeaderItem text='ID' width='30%' />
      <HeaderItem text='Severity' width='15%' />
      <HeaderItem text='Package' width='25%' />
      <HeaderItem text='Version' width='15%' />
      <HeaderItem text='Fixed Version' width='15%' />
    </Box>
  )
}

function Vulnerabilities({image: {vulnerabilities, ...image}}) {
  if (!vulnerabilities || vulnerabilities.length === 0) return <NoVulnerabilities />

  return (
    <Box style={{overflow: 'auto'}} fill>
      <VulnerabilityHeader />
      {vulnerabilities.map((vuln) => (
        <Vulnerability key={vuln.id} vuln={vuln} />
      ))}
    </Box>
  )
}

export function DockerRepository() {
  let history = useHistory()
  const {id} = useParams()
  const {data} = useQuery(DOCKER_IMG_Q, {variables: {dockerRepositoryId: id}})
  useEffect(() => {
    if (!data) return
    const {dockerImages: {edges}} = data
    if (edges.length === 0) return

    history.push(`/dkr/img/${edges[0].node.id}`)
  }, [data])

  return <Loading />
}

const DEFAULT_FILTER = {tag: null, precision: '1h', offset: '1d'}

export function Docker() {
  const {id} = useParams()
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const {data} = useQuery(DOCKER_Q, {
    variables: {id, ...filter}, 
    fetchPolicy: 'cache-and-network'
  })
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  useEffect(() => {
    setFilter(DEFAULT_FILTER)
  }, [id])

  useEffect(() => {
    if (!data) return
    const {dockerImage} = data
    const repository = dockerImage.dockerRepository.repository
    
    setBreadcrumbs([
      {url: `/repositories/${repository.id}`, text: repository.name},
      {url: `/dkr/img/${dockerImage.id}`, text: `${dockerImage.dockerRepository.name}`}
    ])
  }, [data, setBreadcrumbs])

  if (!data) return <Loading />

  const {dockerImage: image} = data
  return (
    <Box fill direction='row' pad='medium' gap='medium'>
      <Box fill width='70%' gap='small'>
        <DockerHeader image={image} />
        <Box fill>
          <Tabs defaultTab='imgs'>
            <TabHeader>
              <TabHeaderItem name='imgs'>
                <Text weight={500} size='small'>Images</Text>
              </TabHeaderItem>
              <TabHeaderItem name='vulns'>
                <Text weight={500} size='small'>Vulnerabilities</Text>
              </TabHeaderItem>
            </TabHeader>
            <TabContent name='imgs'>
              <DockerImages dockerRepository={image.dockerRepository} />
            </TabContent>
            <TabContent name='vulns'>
              <Vulnerabilities image={image} />
            </TabContent>
          </Tabs>
        </Box>
      </Box>
      <Box flex={false} fill='vertical'>
        <DockerSidebar image={image} setFilter={setFilter} filter={filter} />
      </Box>
    </Box>
  )
}